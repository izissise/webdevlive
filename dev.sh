#!/usr/bin/env bash

command -v systemfd &>/dev/null  || { echo "missing systemfd https://github.com/mitsuhiko/systemfd";   exit 1; }
command -v watchexec &>/dev/null || { echo "missing watchexec https://github.com/watchexec/watchexec"; exit 1; }

compile_and_run() {
    set -eu
    local color tty_log_file fdlast socatpid
    tty_log_file=target/buildandrun.log
    color=never
    if [ -t 1 ]; then color=always; fi

    build() { cargo build --color "$color"; } # Change for your build command
    run()   { exec ./target/debug/webdevlive; }               # Change for your run command

    mkdir -p target
    printf '%s\r\n' \
      "HTTP/1.1 200 OK" \
      "Content-Type: text/html; charset=utf-8" \
      "Connection: close" \
      "" \
      "<!doctype html><head><meta charset='utf-8'>" \
      "<title>compiling</title>" \
      "<script src='https://cdn.jsdelivr.net/gh/izissise/webdevlive@refs/heads/main/livedevtty.js'></script>" \
      "<script>activateLive()</script>" \
      "<body><xmp>" \
    > "$tty_log_file"

    socatpid=()
    fdlast=$(( LISTEN_FDS_FIRST_FD + LISTEN_FDS - 1))
    for fd in $(seq "$LISTEN_FDS_FIRST_FD" "$fdlast"); do
      socat ACCEPT-FD:"$fd",fork OPEN:"$tty_log_file",seek=0,ignoreeof,rdonly'!!OPEN:/dev/null,wronly' 2>/dev/null &
      socatpid+=("$!")
    done

    kill_socat() {
        for pid in "${socatpid[@]}"; do
            pkill -P "$pid" 2>/dev/null || true # Kill children (active streams)
            kill "$pid" 2>/dev/null || true     # Kill parent (the listener)
        done
    }
    trap "kill_socat" INT TERM EXIT
    {
      { build || { echo "[build error $?, waiting for modification]"; sleep 99999; }; } \
      && {
        kill_socat
        run
      };
    } 2>&1 | tee -a "$tty_log_file"
}
echo 'Launching auto compile and livereload';
LISTENING_PORT=${LISTENING_PORT:-8008}
systemfd \
  --no-pid \
  --socket http::'[::1]':"$LISTENING_PORT" \
  --socket http::127.0.0.1:"$LISTENING_PORT" \
  -- \
  watchexec \
  --shell=bash --quiet \
  --restart --clear --debounce 2s --notify \
  --exts rs --watch Cargo.toml --watch src/ \
  --env LISTENING_PORT=${LISTENING_PORT:-8000} \
  --env RUST_LOG=${RUST_LOG:-debug} \
  --env TTY_LOG_FILE=${TTY_LOG_FILE:-target/buildandrun.log} \
  -- "$(declare -f compile_and_run); compile_and_run";

