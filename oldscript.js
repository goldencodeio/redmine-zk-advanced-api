/* eslint-disable prefer-destructuring */
// Written by Vadim Usinov
const maria = require('mariadb');
const http = require('http');

const port = 3030;

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

const pool = maria.createPool({
  user: 'root',
  host: '127.0.0.1',
  database: 'redmine',
});

http
  .createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        body = JSON.parse(body);
        const projectId = body.project;
        const month = body.month;
        let query = '';
        if (month) {
            query = 'SELECT SUM(time_entries.hours) as hours FROM time_entries WHERE issue_id IN ' +
            `(SELECT id FROM issues as i WHERE project_id = (SELECT id FROM projects WHERE identifier = '${projectId}') AND tracker_id = 7 ` +
            'AND EXISTS (SELECT value FROM custom_values WHERE i.id = customized_id ' +
            `AND value >= '4' AND custom_field_id = 7)) ` +
            `AND spent_on BETWEEN STR_TO_DATE('${month}','%Y-%m-%d') AND CURDATE();`;
        } else {
            query = 'SELECT SUM(time_entries.hours) as hours FROM time_entries WHERE issue_id IN ' +
            `(SELECT id FROM issues WHERE project_id = (SELECT id FROM projects WHERE identifier = '${projectId}'));`;
        }
	pool.getConnection().then(conn => {
          conn
            .query(query)
            .then(result => {
                console.log(result);
              res.writeHead(200, {
                'Content-Type': 'text/json',
              });
              res.write(JSON.stringify(result));
              res.end();
              conn.end();
            })
            .catch(err => {
              console.log(err);
              res.writeHead(500, {
                'Content-Type': 'application/json',
              });
              res.write(JSON.stringify(err));
              res.end();
              conn.end();
            })
            .catch(err => {
              console.log(err);
              conn.end();
            })
            .catch(err => {
              res.writeHead(500, {
                'Content-Type': 'application/json',
              });
              res.write(JSON.stringify(err));
              res.end();
              conn.end();
            })
            .catch(err => {
              console.log(err);
              conn.end();
            });
        });
      });
    }
  })
  .listen(port);


          

