export class Configuration {
    private dbHost : string;
    private dbUser: string;
    private db: string;
    private dbPassword: string;
    private scriptPort: number;

    constructor(dbHost: string = '127.0.0.1', dbUser : string = 'root', db: string = 'redmine', scriptPort: number = 3030, dbPassword?: string) {
        this.dbHost = dbHost;
        this.dbUser = dbUser;
        this.db = db;
        this.scriptPort = scriptPort;
        this.dbPassword = dbPassword;
    }

    getDbHost(): string {
        return this.dbHost;
    }

    getDbUser(): string {
        return this.dbUser;
    }

    getDb(): string {
        return this.db;
    }

    getPort(): number {
        return this.scriptPort;
    }

    getDbPassword(): string {
        return this.dbPassword;
    }
}