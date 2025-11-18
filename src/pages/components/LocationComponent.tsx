import type { Location } from "../../app/types"

export const LocationComponent = ({
  location,
  key,
}: {
  location: Location
  key?: number
}) => {
  const image = `/img/locations/${location.imagePath}`
  return (
    <div
      style={{
        alignItems: "center",
        position: "relative",
        width: "50%",
        padding: "0.3rem",
      }}
    >
      <img
        className="location-image"
        src={image}
        alt={location.name}
        style={{ borderRadius: "1rem", minWidth: "100%" }}
      />
      <h1
        style={{
          textAlign: "center",
          fontSize: "1rem",
          position: "absolute",
          bottom: "-5px",
          color: "white",
          width: "100%",
        }}
        safe
      >
        {location.name}
      </h1>
    </div>
  )
}
