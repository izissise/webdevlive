# Web Dev Live Compile Example

![demo](https://github.com/user-attachments/assets/d8ab9d3d-40db-44ff-a141-a3a45980e697)

This is the companion repository for the blog post: **[Web dev backend live compile](https://blog.izissise.net/posts/webdev-livecompile/)**.

It demonstrates a tight development loop for backend web servers. Instead of getting a blank page or "Connection Refused" error while your server recompiles, this setup uses `systemfd` and `socat` to stream the compilation logs directly to your browser using `xterm.js`.

## Prerequisites

You will need the following tools installed:
* **Rust & Cargo**
* **socat** (e.g., `apt install socat` or `brew install socat`)
* **systemfd** (`cargo install systemfd`)
* **watchexec** (`cargo install watchexec-cli`)

## Usage

1. Clone this repository.
2. Run the watcher script `./dev.sh`
