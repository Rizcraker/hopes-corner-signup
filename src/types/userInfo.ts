export interface UserInfo {
  user_id: string;
  hours_volunteered: number;
  active_shifts: string[];
  first_name: string;
  last_name: string;
  birthday: string | null;
  phone_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  employer: string;
  street_address: string;
  city: string;
  zip_code: string;
  organization: string;
  email: string;
  can_self_report?: boolean;
  first_volunteered_at?: string | null;
  age_range?: string | null;
  parent_email?: string | null;
}