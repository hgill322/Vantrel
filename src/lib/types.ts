import type { Issue, Landlord, Property, PropertyRequest, ServiceRequest, Unit } from "@prisma/client";

export type PropertyWithLandlord = Property & { landlord: Landlord; units: Unit[] };
export type IssueWithProperty = Issue & { property: PropertyWithLandlord };
export type ServiceRequestWithProperty = ServiceRequest & { property: PropertyWithLandlord };
export type PropertyRequestWithRelations = PropertyRequest & {
  landlord: Landlord;
  property: PropertyWithLandlord | null;
};
export type { Unit };
