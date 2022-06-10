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
    console.log(template.authConfig.path)
    template.authConfig.path.val = template.authConfig.path[0].val[0].processValue //parseFloat(template.authConfig.path.val)
    template.authConfig.path = template.authConfig.path;
    console.log(template.authConfig.path)

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
   
    var arr = [];
console.log(config.parameters.targetObjectpointId)
    output.data.sensors.forEach(function (item) {

        item.measurements.forEach((data) => {
            console.log(data)
            arr.push(
                {
                "measurements": [
                    data
                ],
                "pointId":  config.parameters.targetObject.pointId
            }
            )
        });
    });
   

    const result = {
        [config.output.context]: config.output.contextValue,
        [config.output.object]: {
            [config.output.array]: arr,
        },
    };

    return result;
    
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
