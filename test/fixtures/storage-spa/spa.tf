locals {
  index_html = <<-HTML
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Azure Storage SPA</title>
        <style>
          :root {
            color-scheme: dark;
            font-family: Inter, system-ui, sans-serif;
            background: #08111f;
            color: #e8f0ff;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at 20% 20%, #123d68 0, transparent 35%),
              linear-gradient(145deg, #08111f, #10233d);
          }
          main {
            width: min(680px, calc(100% - 32px));
            padding: 40px;
            border: 1px solid #31577c;
            border-radius: 20px;
            background: rgb(9 24 42 / 88%);
            box-shadow: 0 24px 80px rgb(0 0 0 / 35%);
          }
          nav { display: flex; gap: 12px; margin-bottom: 32px; }
          a {
            color: #7dd3fc;
            text-decoration: none;
            padding: 8px 12px;
            border-radius: 8px;
            background: #102f4d;
          }
          h1 { margin-top: 0; font-size: clamp(2rem, 7vw, 4rem); }
          p { color: #b7c8df; line-height: 1.7; }
          code { color: #f9a8d4; }
        </style>
      </head>
      <body>
        <main>
          <nav>
            <a href="#/">Home</a>
            <a href="#/about">About</a>
          </nav>
          <section id="app"></section>
        </main>
        <script>
          const pages = {
            "/": {
              title: "Azure Storage SPA",
              body: "This single-page application was deployed entirely by Terraform."
            },
            "/about": {
              title: "About",
              body: "Azure Storage serves the HTML while hash routing keeps navigation client-side."
            }
          };

          function render() {
            const route = location.hash.slice(1) || "/";
            const page = pages[route] || {
              title: "Page not found",
              body: "Use the navigation above to return to the SPA."
            };
            document.querySelector("#app").innerHTML =
              `<h1>$${page.title}</h1><p>$${page.body}</p><p>Route: <code>$${route}</code></p>`;
          }

          addEventListener("hashchange", render);
          render();
        </script>
      </body>
    </html>
  HTML
}
