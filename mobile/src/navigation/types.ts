/**
 * AuraNER / NER-Route AI — Navigation Parameter Lists
 */

export type AuthStackParamList = {
  PhoneLogin: undefined;
  OtpVerification: { phone: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  MyTripTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Navigation: { tripId?: string };
  TripStatus: { tripId?: string };
  ReportProblem: undefined;
  EmergencySos: undefined;
  OfflineSync: undefined;
};
