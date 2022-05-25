'use strict';
/**
 * Module dependencies.
 */
const _ = require('lodash');

/**
 * Fidelix request compose and response parsing.
 */




/**
 * Composes request arguments.
 *
 * @param {Object} config
 * @param {Object} template
 * @return {Object}
 */
const template = async (config, template) => {
   

    
        // 2. Latest data.
        if (template.authConfig.function.includes('getPointDataList')) {
            // Multiple values per request.
            template.authConfig.path = {'point_ids': template.authConfig.path.map((id) => {return {string: id};})};
        } else {
            // One value per request (getPointData).
            template.authConfig.path = {'point_ids': template.authConfig.path.map((id) => {return {point_id: id};})};
        }
   // console.log(template)
    return template;
};

/**
 * Parses response data.
 *
 * @param {Object} config
 * @param {Object} response
 * @return {Object}
 */
const response = async (config, response) => {
    console.log(response)
    if (!_.isObject(response)) {
        return response;
    }
    console.log(response)
    let result = [];

   

    // 2. Multiple values per request (latest).
    const array = 'getPointDataListResult';
    const dataObject = 'PointData';
    const valueKey = 'getPointDataResult';

 
    try {
        if (Object.hasOwnProperty.call(response, array)) {
            /** 1. */
            if (Object.hasOwnProperty.call(response[array], 'PointData')) {
                if (Array.isArray(response[array][dataObject])) {
                    for (let i = 0; i < response[array][dataObject].length; i++) {
                        if (Object.hasOwnProperty.call(response[array][dataObject][i], 'Id')) {
                            const data = {
                                hardwareId: response[array][dataObject][i]['Id'],
                                [valueKey]: response[array][dataObject][i]['Value'],
                            };
                            result.push(data);
                        }
                    }
                }
            }
        } else {
            result = response;
        }

        
        return result;
    } catch (e) {
        return result;
    }
};

/**
 * Translates response id to request id.
 *
 * @param {Object} config
 * @param {String/Object} id
 * @return {String/Object}
 */
const id = async (config, id) => {
    let translation;
    try {
        translation = config.parameters.ids.find(reqId => Object.values(reqId).includes(id));
        const keys = Object.keys(translation);
        translation = keys.length === 1 && keys[0] === 'id' ? id : translation;
    } catch (err) {
        return id;
    }
    return translation || id;
};

/**
 * Filters data by point ids.
 *
 * @param {Object} config
 * @param {Object} output
 * @return {Object}
 */
const output = async (config, output) => {
    const ids = [];
    try {
        ids.push(...config.parameters.ids.map(entry => entry.id || entry).flat());
        output[config.output.object][config.output.array] = output[config.output.object][config.output.array]
            .filter(i => !!i).filter(d => ids.map(id => JSON.stringify(id))
                .includes(JSON.stringify(d[config.output.id].id || d[config.output.id])));
        return output;
    } catch (err) {
        return output;
    }
};

/**
 * Expose plugin methods.
 */
module.exports = {
    name: 'fidelix-2',
    template,
    response,
    id,
    output,
};
