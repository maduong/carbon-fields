/**
 * The external dependencies.
 */
import { head, isUndefined } from 'lodash';
import $ from 'jquery';

/**
 * The internal dependencies.
 */
import { TYPE_COMPLEX, VALUE_PROPERTY } from 'fields/constants';
import { getFieldById, getFieldByName } from 'fields/selectors';
import {
	updateField,
	addComplexGroup,
	removeComplexGroup
} from 'fields/actions';

class Api {

	/**
	 * Constructor
	 * 
	 * @param {Object} store The entire redux store
	 */
	constructor(store) {
		this.store = store;
		$(document).trigger('carbonFields.apiLoaded');
	}

	/**
	 * Get a field's value
	 * 
	 * @param  {string} fieldName Field name and hierarchy
	 * @return {Object}
	 */
	getFieldValue(fieldName) {
		let field = getFieldByName(this.store.getState(), fieldName);
		if (isUndefined(field)) {
			return;
		}

		if (field.type === TYPE_COMPLEX) {
			let value = [];
			for (let i = field.value.length - 1; i >= 0; i--) {
				let group = field.value[i];
				let fieldValue = {[VALUE_PROPERTY]: group.name};

				for (let j = group.fields.length - 1; j >= 0; j--) {
					let groupField = group.fields[j];
					fieldValue[groupField.base_name] = this.getFieldValue(fieldName + '[' + i + ']/' + groupField.base_name);
				}

				value.push(fieldValue);
			}
			return value;
		}
		return field.value;
	}

	/**
	 * Set a field's value
	 * 
	 * @param {string} fieldName Field name and hierarchy
	 */
	setFieldValue(fieldName, value) {
		let field = getFieldByName(this.store.getState(), fieldName);
		if (isUndefined(field)) {
			return;
		}

		if (field.type === TYPE_COMPLEX) {
			for (let i = field.value.length - 1; i >= 0; i--) {
				this.removeComplexFieldGroup(fieldName, 0);
			}

			for (var i = 0; i < value.length; i++) {
				let fieldValues = value[i];
				this.addComplexFieldGroup(fieldName, fieldValues[VALUE_PROPERTY]);

				for (let fieldBaseName in fieldValues) {
					if (fieldBaseName === VALUE_PROPERTY) {
						continue;
					}
					let fieldValue = fieldValues[fieldBaseName];
					let nextFieldName = fieldName.replace(/\[\d+\]$/, ''); // remove the trailing index if the user accidentally left it there
					nextFieldName = nextFieldName + '[' + i + ']/' + fieldBaseName;
					this.setFieldValue(nextFieldName, fieldValue);
				}
			}
		} else {
			this.store.dispatch(updateField(field.id, { value }));
		}
	}

	/**
	 * Add a group to a complex field
	 * 
	 * @param {string} fieldName Field name and hierarchy
	 * @param {string} groupName Group name to create. Default is '_'.
	 */
	addComplexFieldGroup(fieldName, groupName) {
		let field = getFieldByName(this.store.getState(), fieldName);
		if (isUndefined(field)) {
			return;
		}

		let group = head(field.groups.filter(group => group.name === groupName));
		if (isUndefined(group)) {
			console.warn(`The specified group does not exist: ${groupName}`);
			return;
		}
		
		this.store.dispatch(addComplexGroup(field.id, groupName));
	}

	/**
	 * Remove a group from a complex field
	 * 
	 * @param {string} fieldName Field name and hierarchy
	 * @param {integer} groupIndex The index of the group to remove
	 */
	removeComplexFieldGroup(fieldName, groupIndex) {
		let field = getFieldByName(this.store.getState(), fieldName);
		if (isUndefined(field)) {
			return;
		}

		if (isUndefined(field.value[groupIndex])) {
			console.warn(`The specified complex field does not have an entry with index of ${groupIndex}.`);
			return;
		}
		
		this.store.dispatch(removeComplexGroup(field.id, field.value[groupIndex].id));
	}
}

export default Api;