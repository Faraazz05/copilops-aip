/**
 * CopilOPS Aeronautical Data Platform - TypeScript Type Definitions
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
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
  tora?: number | null;
  toda?: number | null;
  asda?: number | null;
  lda?: number | null;
  remarks?: string | null;
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
}

export interface IWaypoint {
  identifier: string;
  latitude: number;
  longitude: number;
  routes_enr_3_2?: string | null;
  routes_other?: string | null;
  raw_text?: string | null;
  section?: string | null;
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
}

export interface IIssue {
  severity: "ERROR" | "WARN";
  code: string;
  entity_type: string;
  entity_key: string;
  section: string;
  message: string;
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
}
