var sql = require("mssql");
const lodash = require('lodash');

/**
 * Sends getDataFromDb request .
 *
 * @param {Object} config
 * @return {Promise}
 */
async function getDataFromDb(config) {
    return new Promise(function (resolve, reject) {
        try {
            var configuration = {
                user: config.authConfig.user,
                password: config.authConfig.password,
                server: config.authConfig.server,
                database: config.authConfig.database,
                port: config.authConfig.port,
                options: {
                    encrypt: false
                }
            };

            sql.connect(configuration, function (err) {

                if (err) console.log(err);
                var ids = config.parameters.targetObject.map(item => item.idLocal)

                // create Request object
                var request = new sql.Request();

                // query to the database and get the records
                request.query(`SELECT 
                                KohdeOsapuoliyhteys.id as KohdeOsapuoliyhteys_id,
                                KohdeOsapuoliyhteys.KohteetId,
                                KohdeOsapuoliyhteys.YhteysAlkaa,
	                            KohdeOsapuoliyhteys.YhteysLoppuu,
                                Kustannuspaikat.id as Kustannuspaikat_id,
                                Kustannuspaikat.name as Kustannuspaikat_name,
                                Roolit.id as Roolit_id,
                                Roolit.name as Roolit_name,
                                Osapuolet.OsapuoliId,
                                Osapuolet.OsapuoliNimi
                            from 
                                pot.KohdeOsapuoliyhteys,
                                pot.Kustannuspaikat,
                                pot.Roolit,
                                pot.Osapuolet
                            where 
                                KohteetId IN ( ${ids.join()}) and 
                                pot.KohdeOsapuoliyhteys.KohteetId =pot.Kustannuspaikat.Id and 
                                pot.KohdeOsapuoliyhteys.RooliId =pot.Roolit.Id and
                                pot.KohdeOsapuoliyhteys.OsapuoliId =pot.Osapuolet.OsapuoliId;`,
                    function (err, recordset) {
                        if (err) {
                            reject(err)
                        }
                        let data = recordset.recordset
                        sql.close()
                        resolve(data)

                    });
            });
        } catch (error) {
            reject(error)
        }
    });
}


/**
 * Transforms output to Platform of Trust context schema.
 *
 * @param {Object} config
 * @param {Object} output
 * @return {Object}
 */
const output = async (config, output) => {
    var arr = []
    data = await getDataFromDb(config)
    data.forEach(function (item) {
        let index = lodash.findIndex(arr, function (o) { return o.idLocal == item.KohteetId })
        if (index < 0) {
            arr.push({
                "@type": "CostLocation",
                "idLocal": item.KohteetId,
                "name": item.Kustannuspaikat_name,
                "role": [
                    {
                        "@type": "Role",
                        "idLocal": item.Roolit_id,
                        "name": item.Roolit_name,
                        "startDateTime": item.YhteysAlkaa,
                        "endDateTime": item.YhteysLoppuu,
                        "party": {
                            "@type": "Person",
                            "idLocal": item.OsapuoliId,
                            "name": item.OsapuoliNimi
                        }
                    }
                ]
            })
        }
        else {
            arr[index].role.push({
                "@type": "Role",
                "idLocal": item.Roolit_id,
                "name": item.Roolit_name,
                "startDateTime": item.YhteysAlkaa,
                "endDateTime": item.YhteysLoppuu,
                "party": {
                    "@type": "Person",
                    "idLocal": item.OsapuoliId,
                    "name": item.OsapuoliNimi
                }
            })
        }
    })
    const result = {
        [config.output.context]: config.output.contextValue,
        [config.output.object]: {
            [config.output.array]: arr,
        },
    };

    return result;
}


module.exports = {
    name: 'tampuuri-roleinformation',
    output
};