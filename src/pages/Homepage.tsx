export const Homepage = ({ title }: { title: string }) => {
    return (
        <>
            <html>
            <head>
                <title>{title}</title>
                <meta charset="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <meta name="color-scheme" content="light dark"/>
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
                />

            </head>
            <body>
            <header>
                <nav>
                <ul><li>Logo</li></ul>
                <ul><li>MakerSpace Bonn e.V.</li></ul>
                <ul><li><a>Home</a></li>
                <li><a>Search</a></li>
                </ul>
                </nav>
            </header>
            <main class="container">
            <h1>MakerSpace Bonn e.v.</h1>
            <p>Willkommen bei unserem MakerSpace Inventar und Aufgaben System.</p>
            <p>Hier können Sie Ihre Projekte verwalten und Ihre Aufgaben planen.</p>
            <p>
                <button class="button"><a href="/todos">Zu den Aufgaben</a></button>

            </p>
            </main>

            </body>
            </html>

            </>
            );
            };