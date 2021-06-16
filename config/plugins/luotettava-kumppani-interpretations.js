'use strict';
const { forEach } = require('lodash');
const rp = require('request-promise');
const converter = require('xml-js');
const cache = require('../../app/cache');

/**
 * Composes authorization header and
 * includes it to the http request options.
 *
 * @param {Object} config
 * @param {Object} options
 * @return {Object}
 */
 const request = async (config, options) => {
     console.log("request" , Date.now());
    try {
        // Check for necessary information.
        if (!config.authConfig.authPath || !config.authConfig.url) {
            return promiseRejectWithError(500, 'Insufficient authentication configurations.');
        }

        var username = config.authConfig.username;
        var password = config.authConfig.password;
        var auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

        options.headers = {
            "Authorization" : auth,
        }
        console.log("request" , Date.now());
        return options;
    }
    catch (err) {
        return Promise.reject(err);
    }
}


/**
 * Splits processes.
 *
 * @param {Object} config
 * @param {Object} response
 * @return {Object}
 */
const response = async (config, data)=>{
    console.log("response" , Date.now());
    var options = {ignoreComment: true};
    let jsObject = converter.xml2js(data.body, options);
    let response = [];
    jsObject.elements[0].elements.filter((company)=>{
        return company.attributes.registration_number === config.parameters.idOfficial && company.attributes.country_code === config.parameters.registrationCountry;
    }).map((companyDetails)=>{
            response.push({
                "@type": "Report",
                "idOfficial": companyDetails.attributes.registration_number,
                "name": companyDetails.attributes.company_name,
                "registrationCountry": companyDetails.attributes.country_code,
                "categorizationTrust": companyDetails.attributes.interpretation,
                "idSystemLocal": companyDetails.attributes.archive_code,
                "created": companyDetails.attributes.created
            })
    });
    console.log("response" , Date.now());
    return response;
}


/**
 * Transforms output to Platform of Trust context schema.
 *
 * @param {Object} config
 * @param {Object} output
 * @return {Object}
 */
const output = async (config, output) => {
    output.data["OrganizationTrustCategory"] = [ output.data.sensors[0].data[0].value ];
    delete output.data.sensors;
    return output;
}


module.exports = {
    name: 'luotettava-kumppani-interpretations',
    request,
    output,
    response,
};