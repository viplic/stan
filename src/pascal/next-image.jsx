import React from "react";

export default function NextImage({ fill, priority, unoptimized, style, ...props }) {
  const imageStyle = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }
    : style;
  return React.createElement("img", { ...props, style: imageStyle, loading: priority ? "eager" : "lazy" });
}
