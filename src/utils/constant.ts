export type Role = "USER" | "ADMIN";

enum Gender {
  male = "MALE",
  female = "FEMALE",
  other = "OTHER",
}

enum UserType {
  Non = "Non",
  Standard = "Standard",
  Basic = "Basic",
  Premium = "Premium"
}

enum Languages {
  en = "en",
  ko = "ko",
}
enum RoleType {
  user = "USER",
  admin = "ADMIN",
}

enum LoginWith {
  Manual = "Manual",
  Kakaotalk = "Kakaotalk",
  Naver = "Naver"
}

enum RelationShip {
  Son = "Son"
}

enum ServiceDuration {
  days = "1 of 3 days",
  week = "1 week",
  month = "1 month"
}




export {
  UserType,
  Gender,
  Languages,
  RoleType,
  LoginWith,
  RelationShip,
  ServiceDuration
};
