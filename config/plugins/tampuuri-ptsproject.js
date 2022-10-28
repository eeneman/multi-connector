var sql = require("mssql");


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

                if (err) {
                    reject(err)
                } else {
                    var ids = config.parameters.targetObject.map(item => item.idLocal).filter(Boolean)
                    var costLocationIds = config.parameters.targetObject.map(item => item.costLocation?.idLocal).filter(Boolean)
                    var condition = ""
                    if (ids.length > 0 && costLocationIds.length > 0) {
                        condition = `(Remonttinro IN ( ${ids.join()}) or
                                kohteetid IN ( ${costLocationIds.join()}))`
                    }
                    else if (costLocationIds.length > 0) {
                        condition = `kohteetid IN ( ${costLocationIds.join()})`
                    }
                    else {
                        condition = `Remonttinro IN ( ${ids.join()})`
                    }

                    // create Request object
                    var request = new sql.Request();

                    // query to the database and get the records
                    request.query(`select 
                                    Pts.Remonttinro,
                                    Pts.Vastuuhenkilöid,
                                    Pts.Vuosi,
                                    "Alkuperäinen status" as statusOriginal,
                                    Pts.Vastuuhenkilö,
                                    Pts.Budjettihinta,
                                    Pts.Toteutunuthinta,
                                    Pts.RemontinTila,
                                    Pts.Nimi,
                                    Pts.Kuvaus,
                                    Pts.kohteetid,
                                    Kustannuspaikat.name as costLocationName
                                from 
                                    pot.Pts,
                                    pot.Kustannuspaikat 
                                Where 
                                    ${condition} and 
                                    pot.Pts.kohteetid=pot.Kustannuspaikat.id;`,
                        function (err, recordset) {
                            if (err) {
                                reject(err)
                                sql.close()
                            } else {
                                let data = recordset.recordset
                                sql.close()
                                resolve(data)

                            }
                        });
                }
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
        arr.push({
            "@type": "Project",
            "description": item.Kuvaus,
            "idLocal": item.Remonttinro,
            "status": item.RemontinTila,
            "statusOriginal": item.statusOriginal,
            "plannedStart": item.Vuosi,
            "priceBudget": item.Budjettihinta,
            "costLocation": {
                "@type": "Organization",
                "name": item.costLocationName,
                "idLocal": item.kohteetid
            },
            "owner": {
                "@type": "Organization",
                "name": item.Vastuuhenkilö,
                "idLocal": item.Vastuuhenkilöid
            }
        })
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
    name: 'tampuuri-ptsproject',
    output
};