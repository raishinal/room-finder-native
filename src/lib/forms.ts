import { options, type Field } from "@/components/mobile-ui";
export const select = (
  name: string,
  values: string[],
  required = true,
): Field => ({ name, type: "select", options: options(values), required });
export const text = (name: string, required = false, max = 255): Field => ({
  name,
  required,
  max,
});
export const number = (
  name: string,
  min: number,
  max: number,
  required = true,
): Field => ({ name, type: "number", required, min, max });
export const date = (name: string, required = false): Field => ({
  name,
  type: "date",
  required,
});
export const password: Field[] = [
  { name: "password", type: "password", required: true },
  { name: "password_confirmation", type: "password", required: true },
];
export const address: Field[] = [
  text("address_line"),
  text("city", false, 100),
  text("state", false, 100),
  text("postal_code", false, 30),
  text("country", false, 100),
  date("dob"),
];
export const profile: Field[] = [
  text("name", true),
  { name: "email", type: "email", required: true, max: 255 },
  ...address,
  {
    name: "profile_picture",
    type: "image",
    hint: "JPEG, PNG or WebP, up to 2 MB.",
  },
  { name: "remove_profile_picture", type: "boolean" },
];
export const propertyTypes = [
  "house",
  "apartment",
  "room",
  "building",
  "other",
];
export const propertyFields: Field[] = [
  text("name", true, 150),
  select("property_type", propertyTypes),
  select("status", ["draft", "archived"]),
  { name: "description", type: "multiline", max: 5000 },
  text("address_line", true),
  text("city", true, 100),
  text("state", false, 100),
  text("postal_code", false, 30),
  text("country", true, 100),
  number("latitude", -90, 90, false),
  number("longitude", -180, 180, false),
  {
    name: "amenities",
    type: "multi",
    options: options([
      "wifi",
      "parking",
      "garden",
      "terrace",
      "water_supply",
      "power_backup",
      "security",
      "elevator",
    ]),
  },
  {
    name: "photos",
    type: "images",
    hint: "Up to 12 saved photos, JPEG/PNG/WebP, each at most 4 MB and 4096 × 4096.",
  },
];
export const unitFields: Field[] = [
  text("name", true, 150),
  number("capacity", 1, 50),
  number("bedrooms", 0, 30),
  number("bathrooms", 0, 30),
  { name: "is_active", type: "boolean" },
];
export const listingFields: Field[] = [
  text("title", true, 150),
  { name: "description", type: "multiline", required: true, max: 5000 },
  select("status", ["draft", "published", "paused"]),
  {
    name: "price",
    required: true,
    hint: "Decimal amount, up to two decimal places. Per night for short stays; per month for long-term.",
  },
  { name: "deposit", hint: "Decimal amount, applies to long-term rentals." },
  select("currency", ["NPR", "USD", "INR"]),
  number("min_nights", 1, 365),
  number("max_nights", 1, 365),
  { name: "terms", type: "multiline", required: true, max: 5000 },
];
export const noticeFields: Field[] = [
  text("title", true),
  { name: "description", type: "multiline", required: true, max: 10000 },
  date("expires_on", true),
  {
    name: "image",
    type: "image",
    hint: "Required for a new notice. JPEG/PNG/WebP, up to 4 MB. Expiry includes the entire selected date in UTC.",
  },
];
export const messageFields: Field[] = [
  {
    name: "body",
    label: "Message",
    type: "multiline",
    required: true,
    max: 3000,
  },
  {
    name: "viewing_at",
    label: "Propose a viewing (optional)",
    hint: "YYYY-MM-DDTHH:mm in the timezone shown above. A proposal does not reserve the space.",
  },
];
export const discoveryFields: Field[] = [
  text("search", false, 100),
  select("mode", ["", "short_stay", "long_term"], false),
  select("property_type", ["", ...propertyTypes], false),
  number("people", 1, 50, false),
  select("currency", ["NPR", "USD", "INR"]),
  number("max_price", 0, 100000000, false),
  date("starts_on"),
  date("ends_on"),
];
