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

                if (err) console.log(err);
                var ids = config.parameters.targetObject.map(item => item.idLocal)

                // create Request object
                var request = new sql.Request();

                // query to the database and get the records
                request.query(`select 
                                    Id,
                                    Name,
                                    Status,
                                    "Perustiedot: Kiinteistötyyppi" as categorizationLocal,
                                    "Perustiedot: Kunta" as postalArea,
                                    "Perustiedot: Osoite" as streetAddressLine1,
                                    "Perustiedot: Paikkakunta" as city,
                                    "Perustiedot: Postinumero" as postalCode,
                                    "Perustiedot: Rakennusvuosi" as completionMomentYear
                                from 
                                    pot.Kustannuspaikat 
                                Where 
                                    id IN ( ${ids.join()});`,
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
        arr.push({
            "@type": "HousingCompany",
            "name": item.Name,
            "idLocal": item.Id,
            "status": item.Status,
            "categorizationLocal": item.categorizationLocal,
            "address": {
                "@type": "",
                "streetAddressLine1": item.streetAddressLine1,
                "streetAddressLine2": "",
                "city": item.city,
                "postalArea": item.postalArea,
                "postalCode": item.postalCode,
                "country": ""
            },
            "completionMomentYear": item.completionMomentYear
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
    name: 'tampuuri-housingCompanyInformation',
    output
};