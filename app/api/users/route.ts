import { NextRequest } from "next/server";
import { getSessionUser, requireRole } from "@/lib/auth";
import { error, json } from "@/lib/api";
import {
  getAllUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
} from "@/lib/users";
import type { User } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  try {
    requireRole(user, ["manager"]);
  } catch {
    return error("Vetëm për menaxherët", 403);
  }

  return json({ users: getAllUsers() });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  try {
    requireRole(user, ["manager"]);
  } catch {
    return error("Vetëm për menaxherët", 403);
  }

  const body = await request.json();
  const { name, pin, role, active } = body;

  if (!name || !pin || !role) {
    return error("Mungojnë të dhënat e kërkuara");
  }

  if (role !== "agent" && role !== "manager") {
    return error("Roli i pavlefshëm");
  }

  const newUser = addUser({
    name,
    pin,
    role,
    active: active !== false,
  });

  return json({ user: newUser });
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  try {
    requireRole(user, ["manager"]);
  } catch {
    return error("Vetëm për menaxherët", 403);
  }

  const body = await request.json();
  const { id, name, pin, role, active } = body;

  if (!id) {
    return error("Mungon ID");
  }

  const updates: Partial<Omit<User, "id">> = {};
  if (name !== undefined) updates.name = name;
  if (pin !== undefined) updates.pin = pin;
  if (role !== undefined) {
    if (role !== "agent" && role !== "manager") {
      return error("Roli i pavlefshëm");
    }
    updates.role = role;
  }
  if (active !== undefined) updates.active = active;

  const updatedUser = updateUser(Number(id), updates);
  if (!updatedUser) {
    return error("Përdoruesi nuk u gjet", 404);
  }

  return json({ user: updatedUser });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  try {
    requireRole(user, ["manager"]);
  } catch {
    return error("Vetëm për menaxherët", 403);
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return error("Mungon ID");
  }

  const deleted = deleteUser(Number(id));
  if (!deleted) {
    return error("Përdoruesi nuk u gjet", 404);
  }

  return json({ success: true });
}
