// Written by Vadim Usinov
import * as Koa from 'koa';
import * as logger from 'koa-logger';
import * as Router from 'koa-router';
import * as Body from 'koa-body';
import * as maria from 'mariadb';
import { AddressInfo } from 'net';
import { Configuration } from './Configuration';


async function main() {
    const app = new Koa();
    const router = new Router();
    const config = new Configuration();
    console.log(config)
    let pool;
    if (config.getDbPassword()) {
        pool = maria.createPool({
            user: config.getDbUser(),
            host: config.getDbHost(),
            password: config.getDbPassword(),
            database: config.getDb(),
        });
    } else {
        pool = maria.createPool({
            user: config.getDbUser(),
            host: config.getDbHost(),
            database: config.getDb(),
        });
    }
    

    async function execQuery(query: string): Promise<any> {
        let connection;
        let result;
        try {
            connection = await pool.getConnection();
            result = connection.query(query);
        } catch (err) {
            console.log(err);
        } finally {
            if (connection) connection.end();
            return result;
        }
    }

    app.use(Body());

    router.get('/', (ctx) => {
        ctx.body = 'ZK Redmine Api Service'
    })

    // Get spent hours by project
    router.post('/', async (ctx) => {
        const body = ctx.request.body;
        let query = '';

        /*
            Query:

            SELECT SUM(time_entries.hours) as hours FROM time_entries
                    WHERE issue_id IN
                (SELECT id FROM issues as i
                    WHERE project_id =
                    (SELECT id FROM projects WHERE identifier = '${project}')
                    and tracker_id = 7
                    AND EXISTS
                    (SELECT value FROM custom_values WHERE i.id = customized_id
                    AND value >= '4' AND custom_field_id = 7))
                    AND spent_on
                    BETWEEN STR_TO_DATE('${month}','%Y-%m-%d') AND CURDATE();

            Для быстрой работы необходим добавить индекс к таблице custom_values
            по трем полям: custom_field_id, customized_id, value (1)

            CREATE INDEX index_value_ids ON custom_values(custom_field_id, customized_id,value(1));
            Без него запрос может выполняться более 5 секунд
        */

        if (body.month) {
            query = 'SELECT SUM(time_entries.hours) as hours FROM time_entries WHERE issue_id IN ' +
                `(SELECT id FROM issues as i WHERE project_id = (SELECT id FROM projects WHERE identifier = '${body.project_id}') AND tracker_id = 7 ` +
                'AND EXISTS (SELECT value FROM custom_values WHERE i.id = customized_id ' +
                `AND value >= '4' AND custom_field_id = 7)) ` +
                `AND spent_on BETWEEN STR_TO_DATE('${body.month}','%Y-%m-%d') AND CURDATE();`;
        } else {
            query = 'SELECT SUM(time_entries.hours) as hours FROM time_entries WHERE issue_id IN ' +
                `(SELECT id FROM issues WHERE project_id = (SELECT id FROM projects WHERE identifier = '${body.project_id}'));`;
        }

        const result = await execQuery(query);
        if (result)
            ctx.body = result;
        else
            ctx.status = 500;
    });

    // Get user id by first and last names 
    router.get('/user', async ctx => {
        const { firstname, lastname } = ctx.request.query;
        let query : string;

        query = `SELECT id FROM users WHERE firstname = '${firstname}' AND lastname = '${lastname}';`;

        const result = await execQuery(query);
        if (result)
            ctx.body = result;
        else
            ctx.status = 500;
    });

    // Get projects by user id
    router.get('/projects', async ctx => {
        const { user } = ctx.request.query;
        let query : string;

        /*
            SELECT project_id, identifier, name FROM members INNER JOIN projects ON members.project_id = projects.id WHERE user_id = ;

        */
        query = `SELECT project_id, identifier, name FROM members INNER JOIN projects ON members.project_id = projects.id WHERE user_id = ${user}`;
        const result = await execQuery(query);
        if (result)
            ctx.body = result;
        else
            ctx.status = 500;
    })

    app.use(router.routes());
    app.use(router.allowedMethods());

    // START APP
    const http = app.listen(config.getPort());

    console.log(
        `Application started on port: ${(<AddressInfo>http.address()).port}`,
    );

    process.on('SIGINT', () => process.exit(0));
    return app;
}

main();

