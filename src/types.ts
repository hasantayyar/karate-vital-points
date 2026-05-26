export type BodySide = "front" | "back";

export interface PointCoordinate {
  x: number;
  y: number;
}

export interface VitalPoint {
  id: string;
  order: number;
  name: string;
  /** One or more markers on the diagram (e.g. Shichu, Futto). */
  positions: PointCoordinate[];
}

export interface VitalPointsData {
  front: VitalPoint[];
  back: VitalPoint[];
}

export type GameMode = "study" | "flashcards" | "quiz" | "edit";

export type DotFeedback = "none" | "correct" | "incorrect";

export interface PlacedVitalPoint extends VitalPoint {
  side: BodySide;
}

/** A single marker on the diagram, linked to a vital point. */
export interface PlacedDot {
  pointId: string;
  pointName: string;
  order: number;
  side: BodySide;
  positionIndex: number;
  x: number;
  y: number;
}
