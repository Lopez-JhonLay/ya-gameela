import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/server", () => ({
  startGoogleSignIn: vi.fn(),
}));

import SignInPage from "@/app/(auth)/auth/sign-in/page";
import UnauthorizedPage from "@/app/(auth)/auth/unauthorized/page";
import { metadata as authMetadata } from "@/app/(auth)/auth/layout";

describe("authentication pages", () => {
  it("offers only the approved Google sign-in path", () => {
    render(<SignInPage />);

    expect(
      screen.getByRole("heading", { name: "Administrator sign in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
  });

  it("shows a generic denial without account details", () => {
    render(<UnauthorizedPage />);

    expect(
      screen.getByRole("heading", { name: "Access unavailable" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/@gmail\.com/i)).not.toBeInTheDocument();
  });

  it("keeps auth routes out of search results", () => {
    expect(authMetadata.robots).toEqual({ index: false, follow: false });
  });
});
