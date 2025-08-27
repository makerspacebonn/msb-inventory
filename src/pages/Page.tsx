export const Page = ({ title, children }: { title: string, children: Html.Children }) => (
    <html>
    <head>
        <title>{title}</title>
    </head>
    <body>
    <div id="root">{children}</div>
    </body>
    </html>
);
