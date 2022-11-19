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

                if (err) {
                    reject(err)
                } else {
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
                                Kustannuspaikat.[Perustiedot: Nimi] as Kustannuspaikat_nimi,
                                Roolit.id as Roolit_id,
                                Roolit.name as Roolit_name,
                                Roolit.PropertyRights,
                                Osapuolet.OsapuoliId,
                                Osapuolet.OsapuoliNimi,
                                Osapuolet.YritysId,
                                Osapuolet.YritysNimi
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
    if (config.parameters.targetObject.length > 0) {
        data = await getDataFromDb(config)
        data.forEach(function (item) {
            let index = lodash.findIndex(arr, function (o) { return o.idLocal == item.KohteetId })
            if (index < 0) {
                arr.push({
                    "@type": "Organization",
                    "idLocal": typeof item.KohteetId === 'number' ? item.KohteetId.toString() : item.KohteetId,
                    "name": item.Kustannuspaikat_nimi,
                    "role": [
                        {
                            "@type": "Role",
                            "idLocal": typeof item.Roolit_id === 'number' ? item.Roolit_id.toString() : item.Roolit_id,
                            "name": item.Roolit_name,
                            "startDateTime": item.YhteysAlkaa,
                            "endDateTime": item.YhteysLoppuu,
                            "permission": item.PropertyRights,
                            "person": {
                                "@type": "Person",
                                "idLocal": typeof item.OsapuoliId === 'number' ? item.OsapuoliId.toString() : item.OsapuoliId,
                                "name": item.OsapuoliNimi
                            },
                            "organization": {
                                "@type": "Organization",
                                "idLocal": typeof item.YritysId === 'number' ? item.YritysId.toString() : item.YritysId,
                                "name": item.YritysNimi
                            }
                        }
                    ]
                })
            }
            else {
                arr[index].role.push({
                    "@type": "Role",
                    "idLocal": typeof item.Roolit_id === 'number' ? item.Roolit_id.toString() : item.Roolit_id,
                    "name": item.Roolit_name,
                    "startDateTime": item.YhteysAlkaa,
                    "endDateTime": item.YhteysLoppuu,
                    "permission": item.PropertyRights,
                    "person": {
                        "@type": "Person",
                        "idLocal": typeof item.OsapuoliId === 'number' ? item.OsapuoliId.toString() : item.OsapuoliId,
                        "name": item.OsapuoliNimi
                    },
                    "organization": {
                        "@type": "Organization",
                        "idLocal": typeof item.YritysId === 'number' ? item.YritysId.toString() : item.YritysId,
                        "name": item.YritysNimi
                    }
                })
            }
        })
    }
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