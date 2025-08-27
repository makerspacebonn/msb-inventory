export const Home = ({ fruit, title }: { fruit: string[], title: string }) => {
    return (
        <>
            <h1>Welcome {title}</h1>
            <p>Here are some fruits:</p>
            <ul>
                {fruit.map(f => <li>{f}</li>)}
            </ul>
        </>
    );
};