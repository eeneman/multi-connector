'use strict';
const rp = require('request-promise');
const csv = require('csvtojson')
const cache = require('../../app/cache');
const _ = require('lodash');

/**
 * Composes authorization header and
 * includes it to the http request options.
 *
 * @param {Object} config
 * @param {Object} options
 * @return {Object}
 */
const request = async (config, options) => {
    try {
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
 * @param {Object} data
 * @return {Object}
 */
const response = async (config, data) => {
    return data;
}


/**
 * Transforms output to Platform of Trust context schema.
 *
 * @param {Object} config
 * @param {Object} output
 * @return {Object}
 */
const output = async (config, output) => {

    var arr = [];

    for (let i = 0; i < output.data.sensors.length; i++) {
        for (let j = 0; j < output.data.sensors[i].measurements.length; j++) {
            let Obj = await getTagObj(config, output.data.sensors[i].measurements[j].result.Tag)
            arr.push({
                "measurements": [
                    {
                        "@type": Obj.Component ? Obj.Component : "",
                        "timestamp": output.data.sensors[i].measurements[j].timestamp,
                        "value": output.data.sensors[i].measurements[j].result.Value
                    }
                ],
                "id": output.data.sensors[i].measurements[j].result.Tag
            })
        }
    }

    const result = {
        [config.output.context]: config.output.contextValue,
        [config.output.object]: {
            [config.output.array]: arr,
        },
    };
    return result;
}

function getTagObj(config, Tag) {
    return new Promise(async function (resolve, reject) {
        try {
            let TagListItems;
            TagListItems = cache.getDoc('TagListItems', config.authConfig.productCode);
            if (!TagListItems) TagListItems = [];
            let TagObj;
            if (TagListItems.length > 0) {
                TagObj = _.find(TagListItems, { 'Tag': Tag });
            } else {
                let TagListDownloadUrl = await getTagListDownloadUrl(config)
                let TagList = await getTagList(TagListDownloadUrl.body.url)
                TagObj = await csvJSON(config, TagList.body, Tag)
            }
            resolve(TagObj)
        } catch (err) {
            reject(err)
        }
    })
}


async function csvJSON(config, csvFile, Tag) {
    let TagListItems;
    TagListItems = await csv().fromString(csvFile);
    cache.setDoc('TagListItems', config.authConfig.productCode, TagListItems);
    let Obj = _.find(TagListItems, { 'Tag': Tag });
    return Obj
}

async function getTagList($url) {
    try {
        const option = {
            method: 'GET',
            url: $url,
            json: true,
            resolveWithFullResponse: true,
        };
        return rp(option).then(function (result) {

            return Promise.resolve(result);
        }).catch(function (err) {
            return Promise.reject(err);
        });
    } catch (err) {
        return Promise.reject(err);;
    }
}

async function getTagListDownloadUrl(config) {
    try {
        var tempPath = "/gettaglist"
        const option = {
            method: 'GET',
            url: config.authConfig.url + tempPath,
            headers: config.authConfig.headers,
            json: true,
            resolveWithFullResponse: true,
        };
        return rp(option).then(function (result) {

            return Promise.resolve(result);
        }).catch(function (err) {
            return Promise.reject(err);
        });
    } catch (err) {
        return Promise.reject(err);;
    }
}

module.exports = {
    name: 'stavanger',
    request,
    output,
    response
};