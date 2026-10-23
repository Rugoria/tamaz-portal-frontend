import type { Role } from "./types";

/** Where each role lands after signing in. */
export function homeFor(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "CLINIC":
      return "/clinic";
    case "DOCTOR":
      return "/doctor";
    case "CUSTOMER":
      return "/customer/aligners";
  }
}

/** Each person's own account page (change password). */
export function accountFor(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/account";
    case "CLINIC":
      return "/clinic/account";
    case "DOCTOR":
      return "/doctor/account";
    case "CUSTOMER":
      return "/customer/account";
  }
}
