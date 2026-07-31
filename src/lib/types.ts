import type { Issue, Landlord, Property, PropertyRequest, ServiceRequest, SignupRequest, Unit, User } from "@prisma/client";

export type TenantUserSummary = Pick<User, "id" | "email" | "createdAt">;
export type UnitWithTenants = Unit & { tenantUsers: TenantUserSummary[] };
export type UnitWithProperty = Unit & { property: Property };
export type PropertyWithLandlord = Property & { landlord: Landlord; units: UnitWithTenants[] };
export type IssueWithProperty = Issue & { property: PropertyWithLandlord };
export type ServiceRequestWithProperty = ServiceRequest & { property: PropertyWithLandlord };
export type PropertyRequestWithRelations = PropertyRequest & {
  landlord: Landlord;
  property: PropertyWithLandlord | null;
};
export type { Unit, SignupRequest };

export interface UnitDraft {
  label: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
}

export interface PropertyDraft {
  address: string;
  unit: string;
  units: UnitDraft[];
}
