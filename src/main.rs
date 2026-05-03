use anyhow::Result;
use axum::{
    body::Body,
    http::StatusCode,
    response::{Html, IntoResponse},
    routing,
};
use tokio::io::{AsyncReadExt, AsyncSeekExt};

#[tokio::main(flavor = "current_thread")]
async fn main() {
    tokio::spawn(async {
        let mut counter = 0;
        loop {
            // Wait for 5 seconds without blocking the thread
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            counter += 1;
            println!("alive: {counter}");
        }
    });

    let router = axum::Router::new()
        .route("/index.html", routing::get(index))
        .route("/tty", routing::get(tty))
        .fallback(routing::get(|| async {
            axum::response::Redirect::to("/index.html")
        }));

    axum_run(apply_livereload(router).expect("router"))
        .await
        .expect("error");
}

async fn index() -> Result<impl IntoResponse, impl IntoResponse> {
    let path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("src")
        .join("index.html");
    let mut file = tokio::fs::File::open(&path)
        .await
        .map_err(|e| format!("Failed to open file: {e}"))?;
    let mut buf = Vec::new();
    let _n = file
        .read_to_end(&mut buf)
        .await
        .map_err(|e| format!("Failed to read file: {e}"))?;
    Ok::<_, String>((StatusCode::OK, Html(buf)))
}

async fn tty() -> Result<impl IntoResponse, impl IntoResponse> {
    use tokio::io::AsyncReadExt;
    let mut buf = [0_u8; 4096];
    let log_file_path =
        std::env::var("TTY_LOG_FILE").map_err(|e| format!("TTY_LOG_FILE not set: {e}"))?;
    let mut file = tokio::fs::File::open(&log_file_path)
        .await
        .map_err(|e| format!("Failed to open log file: {e}"))?;
    let _n = file.read(&mut buf[..]).await.expect("read");
    let p = buf
        .windows(4)
        .position(|w| w == b"\r\n\r\n")
        .expect("header sep");
    let _s = file
        .seek(std::io::SeekFrom::Start((p + 4) as u64))
        .await
        .expect("seek"); // seek to after http header
    let stream = futures::stream::unfold(file, move |mut file| async move {
        let out = match file.read(&mut buf[..]).await {
            Ok(n) => (buf[..n]).to_vec(),
            Err(_e) => return None,
        };
        Some((Ok::<_, String>(out), file))
    });
    Ok::<_, String>((StatusCode::ACCEPTED, Html(Body::from_stream(stream))))
}

async fn axum_run(router: axum::Router) -> Result<()> {
    fn listen_fd() -> Result<Vec<tokio::net::TcpListener>> {
        let mut res = Vec::new();
        let mut idx = 0;
        let mut lfd = listenfd::ListenFd::from_env();
        while let Some(s) = lfd.take_tcp_listener(idx)? {
            s.set_nonblocking(true).expect("couldn't set non blocking");
            res.push(tokio::net::TcpListener::from_std(s).expect("transform failed"));
            idx += 1;
        }
        Ok(res)
    }

    let listeners = listen_fd()?;
    let listeners = match listeners.is_empty() {
        true => {
            vec![tokio::net::TcpListener::bind("[::0]:8008").await?]
        }
        false => listeners,
    };

    let servers = listeners.into_iter().map(|listener| {
        let routerc = router.clone();
        async move {
            let addr = listener
                .local_addr()
                .ok()
                .map(|s| s.to_string())
                .unwrap_or_default();

            println!("Listening at 'http://{addr}'");
            axum::serve(
                listener,
                routerc.into_make_service_with_connect_info::<std::net::SocketAddr>(),
            )
            .await
        }
    });
    futures::future::try_join_all(servers).await?;
    Ok(())
}

fn apply_livereload(router: axum::Router) -> anyhow::Result<axum::Router> {
    use notify::Watcher;

    const LIVE_RELOAD_IGNORED_EXT: &[&str] = &["kate-swp", "~"];

    let ssejs = r#"
        (() => {
            const inputs = document.currentScript.dataset;
            localStorage.setItem("lr_reload_count", 0);

            let attempts = 1;
            function connect() {
                const source = new EventSource(inputs.eventStream);

                source.addEventListener("reload", () => {
                    attempts = 0;
                    const currentCount = parseInt(localStorage.getItem("lr_reload_count") || "0", 10);
                    localStorage.setItem("lr_reload_count", currentCount + 1);

                    if (localStorage.getItem("lr_auto_reload") !== "false") {
                        source.close();
                        location.reload();
                    }
                });

                source.addEventListener("error", function e() {
                    source.close();
                    attempts += 1;
                    setTimeout(async () => {
                        try {
                            let r = await fetch(inputs.eventStream);
                            if (r.headers.get("content-type")?.includes("event-stream")) {
                                if (localStorage.getItem("lr_auto_reload") !== "false") {
                                    location.reload();
                                } else {
                                    connect();
                                }
                            } else {
                                e();
                            }
                        } catch { e(); }
                    }, 250 + Math.min((attempts * (attempts / 2)) * 100, 60000));
                });
                // { once: true } ensures we don't create duplicate listeners during silent reconnects
                addEventListener("pagehide", () => source.close(), { once: true });
            }
            addEventListener("pageshow", connect);
        })();
    "#;

    let path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src");
    println!("livereload watching {}", &path.display());
    let lr = tower_livereload::LiveReloadLayer::new().inject_payload(ssejs);
    let reloader = lr.reloader();
    let mut watcher = Box::new(notify::recommended_watcher(
        move |result: Result<notify::Event, _>| {
            // filters
            if result
                .map(|e| {
                    (e.kind.is_modify() || e.kind.is_create() || e.kind.is_remove())
                        && e.paths.iter().any(|p| {
                            !LIVE_RELOAD_IGNORED_EXT
                                .iter()
                                .any(|ext| p.extension().is_some_and(|pext| pext == *ext))
                        })
                })
                .unwrap_or(false)
            {
                reloader.reload();
            }
        },
    )?);

    watcher.watch(&path, notify::RecursiveMode::Recursive)?;
    Box::leak(watcher); // leave the watcher thread in the background
    Ok(router.layer(lr))
}
