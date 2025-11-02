interface LayoutProps {
    title: string,
    children?: React.ReactNode,
}
export const Layout = ({title, children }: LayoutProps) => {
    return (
        <>
            <html>
            <head>
                <title>{ title } | Zeug MakerSpace Bonn e.V.</title>
                <meta charset="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <meta name="color-scheme" content="light dark"/>
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
                />
                <link rel="stylesheet" href="/css/styles.css"/>
            </head>
            <body>
            <header>
                <section class="container">
                    <nav>
                        <ul>
                            <li class="logo"><a href="#"><img src="/img/makerspace-bonn-signet.png" alt="MakerSpace Bonn e.V." /></a></li>
                        </ul>
                        <ul>
                            <li><a href="#"> MakerSpace Bonn e.V. </a></li>
                        </ul>
                        <ul>
                            <li><a>Home</a></li>
                            <li><a>Search</a></li>
                        </ul>
                    </nav>
                </section>
            </header>
            <main class="container">
                { children }
            </main>

            </body>
            </html>

        </>
    );
};