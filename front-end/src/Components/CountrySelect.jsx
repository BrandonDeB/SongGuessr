export default function CountrySelect(props) {
    return (
        <>
            <div>
                <h1>{props.country}</h1>
                <h2>{props.abbrv}</h2>
            </div>
        </>
    );
}