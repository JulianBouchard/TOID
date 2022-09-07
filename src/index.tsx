import React from "react";
import { createRoot } from "react-dom/client";
import Body from "./Body";

const container = document.getElementById("root");
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <Body />
  </React.StrictMode>
);
