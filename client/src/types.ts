/**
 * CopilOPS Aeronautical Data Platform - TypeScript Type Definitions
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */

export interface IFieldProvenance {
  value: any;
  unit?: string | null;
  year?: number | string | null;
  section: string;
  status: "PUBLISHED" | "NOT_PUBLISHED" | "INFERRED" | "VALID" | string;
  raw_text?: string;
}

export interface IProvenance {
  source: string;
  section: string;
  source_file: string;
  source_url: string;
  effective_date: string;
  retrieved_at?: string;
  parser_version?: string;
  validation_status?: string;
  raw_text?: string;
  field_provenance?: Record<string, IFieldProvenance>;
}

export interface IRunway {
  key: string;
  icao: string;
  designator: string;
  true_bearing?: number | null;
  length?: number | null;
  width?: number | null;
  surface?: string | null;
  strength?: string | null;
  thr_latitude?: number | null;
  thr_longitude?: number | null;
  thr_elevation?: number | null;
  tdz_elevation?: number | null;
  end_latitude?: number | null;
  end_longitude?: number | null;
  tora?: number | null;
  toda?: number | null;
  asda?: number | null;
  lda?: number | null;
  remarks?: string | null;
  provenance?: IProvenance;
}

export interface INavaid {
  key: string;
  identifier: string;
  name: string;
  type: string;
  frequency?: number | null;
  frequency_unit?: string | null;
  hours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  aerodrome?: string | null;
  ils_system?: string | null;
  ils_category?: string | null;
  remarks?: string | null;
  section?: string | null;
  provenance?: IProvenance;
}

export interface IAirport {
  icao: string;
  name: string;
  operator: string;
  latitude?: number | null;
  longitude?: number | null;
  elevation?: number | null;
  magnetic_variation?: number | null;
  magnetic_variation_year?: number | string | null;
  geoid_undulation?: number | null;
  direction_from_city?: string | null;
  hours: {
    operator?: string | null;
    ats?: string | null;
    customs?: string | null;
    ais?: string | null;
  };
  rffs_category?: string | null;
  runways: IRunway[];
  navaids: INavaid[];
  is_target: boolean;
  provenance?: IProvenance;
}

export interface IWaypoint {
  identifier: string;
  latitude: number;
  longitude: number;
  routes_enr_3_2?: string | null;
  routes_other?: string | null;
  raw_text?: string | null;
  section?: string | null;
  provenance?: IProvenance;
}

export interface IRouteSegment {
  key: string;
  from_point: string;
  to_point: string;
  distance?: number | null;
  coordinates: number[][];
}

export interface IRoute {
  designator: string;
  rnp_type: string;
  availability: string;
  waypoint_sequence: string;
  waypoint_count: number;
  segments: IRouteSegment[];
  is_reconstructed?: boolean;
  disclaimer?: string;
  provenance?: IProvenance;
}

export interface IAirspace {
  id: string;
  designation: string;
  name: string;
  airspace_type: "FIR" | "UIR" | "CTA" | "TMA" | "CTR" | "RESTRICTED" | "DANGER" | "PROHIBITED" | "UAS_ZONE" | "TRA" | "TSA" | string;
  classification?: string | null;
  lower_limit: string;
  upper_limit: string;
  vertical_limit_reference?: string | null;
  geometry?: {
    type: "Polygon";
    coordinates: number[][][]; // GeoJSON [lon, lat]
  } | null;
  boundary_text: string;
  controlling_authority?: string | null;
  activation_schedule?: string | null;
  temporal_type?: "PERMANENT" | "TEMPORARY" | "SCHEDULED" | "ACTIVE_BY_NOTAM" | string;
  valid_from?: string | null;
  valid_until?: string | null;
  source: string;
  source_section: string;
  source_file: string;
  source_url: string;
  effective_date: string;
  retrieved_at?: string;
  parser_version?: string;
  validation_status: "VALID" | "ARC_UNRESOLVED" | "BORDER_UNRESOLVED" | "OUT_OF_RANGE" | "INSUFFICIENT_COORDINATES" | "INVALID_GEOMETRY" | string;
  validation_issues?: string[];
  provenance?: IProvenance;
}

export interface IIssue {
  severity: "ERROR" | "WARN";
  code: string;
  entity_type: string;
  entity_key: string;
  section: string;
  message: string;
  edition?: string;
  detected_by?: string;
}

export interface IChange {
  from_edition: string;
  to_edition: string;
  status: "NEW" | "MODIFIED" | "DELETED" | "UNCHANGED";
  entity_type: string;
  entity_key: string;
  field: string;
  old_value?: string | null;
  new_value?: string | null;
  unit?: string | null;
  section?: string | null;
  comparison_verified?: boolean;
}
