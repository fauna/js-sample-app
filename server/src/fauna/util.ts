import { DocumentT, DocumentReference, QueryValueObject } from "fauna";

export const removeInternalFields = <T>(doc: DocumentT<any>): T => {
  let { ts, ttl, coll, ...rest } = doc;
  for (const key in rest) {
    if (rest[key] instanceof DocumentReference) {
      rest[key] = removeInternalFields(rest[key]);
    }
  }
  return rest;
};
