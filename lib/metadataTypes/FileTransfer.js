'use strict';

const TYPE = require('../../types/mcdev.d');
const MetadataType = require('./MetadataType');
const Util = require('../util/util');
const File = require('../util/file');
const cache = require('../util/cache');

/**
 * FileTransfer MetadataType
 *
 * @augments MetadataType
 */
class FileTransfer extends MetadataType {
    /**
     * Retrieves Metadata of FileTransfer Activity.
     * Endpoint /automation/v1/filetransfers/ returns all File Transfers
     *
     * @param {string} retrieveDir Directory where retrieved metadata directory will be saved
     * @param {void} [_] unused parameter
     * @param {void} [__] unused parameter
     * @param {void} [___] unused parameter
     * @param {string} [key] customer key of single item to retrieve
     * @returns {Promise.<TYPE.MetadataTypeMapObj>} Promise
     */
    static async retrieve(retrieveDir, _, __, ___, key) {
        return super.retrieveREST(retrieveDir, '/automation/v1/filetransfers/', null, null, key);
    }
    /**
     * Retrieves Metadata of  FileTransfer Activity for caching
     *
     * @returns {Promise.<TYPE.MetadataTypeMapObj>} Promise
     */
    static async retrieveForCache() {
        return super.retrieveREST(null, '/automation/v1/filetransfers/');
    }

    /**
     * Retrieve a specific File Transfer Definition by Name
     *
     * @param {string} templateDir Directory where retrieved metadata directory will be saved
     * @param {string} name name of the metadata file
     * @param {TYPE.TemplateMap} templateVariables variables to be replaced in the metadata
     * @returns {Promise.<TYPE.MetadataTypeItemObj>} Promise
     */
    static async retrieveAsTemplate(templateDir, name, templateVariables) {
        const res = await this.client.rest.get(
            '/automation/v1/filetransfers/?$filter=name%20eq%20' + encodeURIComponent(name)
        );
        if (Array.isArray(res?.items) && res?.items?.length) {
            // eq-operator returns a similar, not exact match and hence might return more than 1 entry
            const metadata = res.items.find((item) => item.name === name);
            if (!metadata) {
                Util.logger.error(`No ${this.definition.typeName} found with name "${name}"`);
                return;
            }

            // get full definition
            const extended = await this.client.rest.get(
                '/automation/v1/filetransfers/' + metadata[this.definition.idField]
            );
            const originalKey = extended[this.definition.keyField];
            const val = JSON.parse(
                Util.replaceByObject(
                    JSON.stringify(this.parseMetadata(extended)),
                    templateVariables
                )
            );

            // remove all fields listed in Definition for templating
            this.keepTemplateFields(val);
            await File.writeJSONToFile(
                [templateDir, this.definition.type].join('/'),
                originalKey + '.' + this.definition.type + '-meta',
                JSON.parse(Util.replaceByObject(JSON.stringify(val), templateVariables))
            );
            Util.logger.info(`- templated ${this.definition.type}: ${name}`);
            return { metadata: val, type: this.definition.type };
        } else if (res?.items) {
            Util.logger.error(`No ${this.definition.typeName} found with name "${name}"`);
        } else {
            throw new Error(
                `Encountered unknown error when retrieveing ${
                    this.definition.typeName
                } "${name}": ${JSON.stringify(res)}`
            );
        }
    }

    /**
     * manages post retrieve steps
     *
     * @param {TYPE.MetadataTypeItem} metadata a single fileTransfer activity definition
     * @returns {object[]} metadata
     */
    static postRetrieveTasks(metadata) {
        const values = this.parseMetadata(metadata);
        return values;
    }

    /**
     * Creates a single File Transfer
     *
     * @param {TYPE.MetadataTypeItem} fileTransfer a single File Transfer
     * @returns {Promise} Promise
     */
    static create(fileTransfer) {
        return super.createREST(fileTransfer, '/automation/v1/filetransfers/');
    }

    /**
     * Updates a single File Transfer
     *
     * @param {TYPE.MetadataTypeItem} fileTransfer a single File Transfer
     * @returns {Promise} Promise
     */
    static update(fileTransfer) {
        return super.updateREST(fileTransfer, '/automation/v1/filetransfers/' + fileTransfer.id);
    }

    /**
     * prepares a fileTransfer for deployment
     *
     * @param {TYPE.MetadataTypeItem} metadata a single fileTransfer activity definition
     * @returns {Promise} Promise
     */
    static async preDeployTasks(metadata) {
        if (metadata.r__ftpLocation_name) {
            metadata.fileTransferLocationId = cache.searchForField(
                'ftpLocation',
                metadata.r__ftpLocation_name,
                'name',
                'id'
            );
        } else {
            throw new Error(
                'r__ftpLocation_name not set. Please ensure the source is properly set up and re-retrieve it first.'
            );
        }
        return metadata;
    }
    /**
     * parses retrieved Metadata before saving
     *
     * @param {TYPE.MetadataTypeItem} metadata a single fileTransfer activity definition
     * @returns {TYPE.MetadataTypeItem} parsed metadata
     */
    static parseMetadata(metadata) {
        try {
            metadata.r__ftpLocation_name = cache.searchForField(
                'ftpLocation',
                metadata.fileTransferLocationId,
                'id',
                'name'
            );
            delete metadata.fileTransferLocationId;
        } catch (ex) {
            Util.logger.warn(
                ` - FileTransfer '${metadata[this.definition.keyField]}': ${ex.message}`
            );
        }

        return metadata;
    }
}

// Assign definition to static attributes
FileTransfer.definition = require('../MetadataTypeDefinitions').fileTransfer;

module.exports = FileTransfer;
