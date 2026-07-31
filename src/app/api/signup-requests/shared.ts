// Never return passwordHash to the client.
export const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  planKey: true,
  properties: true,
  status: true,
  reviewNote: true,
  reviewedAt: true,
  createdAt: true,
} as const;
