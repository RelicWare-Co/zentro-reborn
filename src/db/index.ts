import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "./schema/index.ts";

export interface EnvConfig {
  databaseUrl: string;
  authToken: string;
}

export const Environment: EnvConfig = {
  authToken: process.env.DATABASE_AUTH_TOKEN ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
};

export class DBInstance {
  private static dbIstance: DBInstance;
  private readonly settings: EnvConfig;
  public db: LibSQLDatabase<typeof schema>;

  private constructor() {
    this.settings = {
      databaseUrl: Environment.databaseUrl,
      authToken: Environment.authToken,
    };
    DBInstance.dbIstance;
    this.db = this.connection();
  }

  private connection(): LibSQLDatabase<typeof schema> {
    const conexDB = drizzle({
      connection: { url: this.settings.databaseUrl },
      schema,
    });

    const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
      get(_target, property, receiver) {
        const target = conexDB;
        const value = Reflect.get(target, property, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    return db;
  }

  public static getIstance(): DBInstance {
    if (!DBInstance.dbIstance) {
      DBInstance.dbIstance = new DBInstance();
    }
    return DBInstance.dbIstance;
  }
}
