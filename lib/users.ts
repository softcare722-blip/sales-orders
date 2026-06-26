import { getStore, type User, persist } from "./db";

export function getAllUsers(): User[] {
  const s = getStore();
  return s.users;
}

export function getUserById(id: number): User | null {
  const s = getStore();
  return s.users.find((u) => u.id === id) ?? null;
}

export function addUser(user: Omit<User, "id">): User {
  const s = getStore();
  const newUser: User = {
    id: s.nextId.users++,
    ...user,
  };
  s.users.push(newUser);
  persist();
  return newUser;
}

export function updateUser(id: number, updates: Partial<Omit<User, "id">>): User | null {
  const s = getStore();
  const index = s.users.findIndex((u) => u.id === id);
  if (index === -1) return null;
  s.users[index] = { ...s.users[index], ...updates };
  persist();
  return s.users[index];
}

export function deleteUser(id: number): boolean {
  const s = getStore();
  const index = s.users.findIndex((u) => u.id === id);
  if (index === -1) return false;
  s.users.splice(index, 1);
  persist();
  return true;
}
