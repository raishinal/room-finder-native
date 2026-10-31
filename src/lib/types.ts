export type Role = "finder" | "owner" | "admin" | "superadmin";
export type Workspace = "finder" | "owner" | "admin";
export interface User {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  email_verified_at: string | null;
  is_active: boolean;
  blocked_at: string | null;
  can_manage?: boolean;
  profile_picture_url?: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  dob?: string | null;
}
export interface Page<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}
export interface Photo {
  id: number;
  url: string;
  is_hidden?: boolean;
  is_cover?: boolean;
}
export interface Property {
  id: number;
  name: string;
  property_type: string;
  status: string;
  description: string | null;
  address_line: string;
  city: string;
  country: string;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  cover_photo_url: string | null;
  photos: Photo[];
}
export interface Unit {
  id: number;
  property_id: number;
  property_name: string;
  name: string;
  unit_type: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  is_active: boolean;
}
export interface Listing {
  id: number;
  unit_id: number;
  title: string;
  description: string;
  mode: string;
  status: string;
  price_minor: number;
  deposit_minor: number;
  currency: string;
  min_nights: number;
  max_nights: number;
  terms: string;
  unit: Unit;
  city: string;
  country: string;
  property_type: string;
  amenities: string[];
  host_name: string;
  cover_photo_url: string | null;
  photos: Photo[];
}
export interface Activity {
  id: number;
  kind: "bookings" | "applications" | "tenancies";
  listing_id: number;
  title: string;
  unit_name: string;
  city: string;
  finder_name: string;
  status: string;
  starts_on: string;
  ends_on: string | null;
  price_minor: number;
  deposit_minor: number;
  total_minor: number | null;
  currency: string;
  terms: string;
  note: string | null;
  people: number;
}
export interface Notice {
  id: number;
  title: string;
  description: string;
  image_url: string;
  expires_on: string;
  is_visible: boolean;
}
export interface CalendarEvent {
  id: number;
  unit_id: number;
  booking_id: number | null;
  tenancy_id: number | null;
  starts_on: string;
  ends_on: string | null;
  label: string;
}
export interface Thread {
  id: number;
  listing_id: number;
  title: string;
  person: string;
}
export interface Message {
  id: number;
  body: string;
  viewing_at: string | null;
  mine: boolean;
  sender: string;
  created_at: string;
}
export interface Notification {
  id: number;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}
