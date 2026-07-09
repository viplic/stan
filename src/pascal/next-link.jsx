import React from "react";

export default function NextLink({ href = "#", children, ...props }) {
  return React.createElement("a", { href, ...props }, children);
}
