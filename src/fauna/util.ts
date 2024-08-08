import { DocumentT, DocumentReference, QueryValueObject } from "fauna";

export const docTo = <T extends QueryValueObject>(doc: DocumentT<T>): T => {
  let { ts, ttl, coll, toObject, ...rest } = doc;
  for (const key in rest) {
    const k = key as keyof Omit<
      DocumentT<T>,
      "ts" | "ttl" | "coll" | "toObject"
    >;
    if (rest[k] instanceof DocumentReference) {
      // Recursively convert nested documents. We use `any` here
      // because the type of the nested document is unknown.
      rest[k] = docTo<any>(rest[key]);
    }
  }
  return rest as T;
};
