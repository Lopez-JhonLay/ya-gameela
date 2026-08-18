import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  it("renders the starter content", () => {
    render(<Home />);

    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
