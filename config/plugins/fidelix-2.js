'use strict';
/**
 * Module dependencies.
 */
const _ = require('lodash');


/**
 * Composes request arguments.
 *
 * @param {Object} config
 * @param {Object} template
 * @return {Object}
 */
const template = async (config, template) => {
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
    if (!_.isObject(response)) {
        return response;
    }
    let result = [];

    // 1. One value per request (latest).
    const single = 'setPointDataResult';



    try {
       if (Object.hasOwnProperty.call(response, single)) {
        console.log(response)

            const data = {
                [single]: response['setPointDataResult'],
                hardwareId: response.hardwareId['point_id'],
            };
            result.push(data);
        } else {
            result = response;
        }
        

        return result;
    } catch (e) {
        return result;
    }
};



/**
 * Filters data by point ids.
 *
 * @param {Object} config
 * @param {Object} output
 * @return {Object}
 */
const output = async (config, output) => {
   
    // var arr = [];
    // output.data.sensors.forEach(function (item) {

    //     item.measurements.forEach((data) => {
    //         arr.push(
    //             {
    //                 data
    //             }
    //         )
    //     });
    // });
   

    // const result = {
    //     [config.output.context]: config.output.contextValue,
    //     [config.output.object]: {
    //         [config.output.array]: arr,
    //     },
    // };

    return output;
    
};

/**
 * Expose plugin methods.
 */
module.exports = {
    name: 'fidelix-2',
    template,
    response,
    
    output,
};
