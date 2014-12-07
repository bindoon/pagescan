'use strict';

/**
 * hash
 */
function Hash() {
    this.hashTable = new Object();
}
Hash.prototype={
    isKeyExists: function(key) {
        return (key in this.hashTable);
    },
    add : function(key, value) {
    if (!(this.isKeyExists(key))) {
        this.hashTable[key] = value;
    }
    },
    del : function(key) {
    if (this.isKeyExists(key)) {
        delete (this.hashTable[key]);
    }
    },
    getValue : function(key) {
        return this.hashTable[key];
    },
    alter : function(key, value) {
        this.hashTable[key] = value;
    },
    getCount:function(){
        var count = 0;
        for (var i in  this.hashTable) {
            count++;
        };
        return count;
    },
    addMap : function(key, value){
        if (this.isKeyExists(key)){
            this.hashTable[key].total ++;
            this.hashTable[key].idArray.push(value);
        }else{
            this.hashTable[key] = new LinkCF(value, key);
        }
    }
}

module.exports = Hash;