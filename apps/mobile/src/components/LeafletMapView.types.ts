import type { ViewStyle } from "react-native";
import type { LatLng } from "@fleettrack/shared-types";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  heading?: number;
  color?: string;
  label?: string;
}

export interface LeafletMapViewProps {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  circle?: { center: LatLng; radiusMeters: number };
  polygon?: LatLng[];
  onMapPress?: (point: LatLng) => void;
  onMarkerPress?: (id: string) => void;
  style?: ViewStyle;
}
