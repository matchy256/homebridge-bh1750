var Service;
var Characteristic;
var HomebridgeAPI;
var BH1750_Library = require('bh1750_lux');

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    HomebridgeAPI = homebridge;

    homebridge.registerAccessory("homebridge-bh1750", "bh1750", BH1750);
};

function BH1750(log, config) {
    this.log = log;
    this.name = config.name;

    const options = {};

    // Set I2C address, default to 0x23
    options.addr = config.address ? parseInt(config.address, 16) : 0x23;

    // Set I2C bus number, default to 1
    options.bus = config.bus !== undefined ? config.bus : 1;

    this.log(`Initializing BH1750 sensor on I2C bus ${options.bus} at address 0x${options.addr.toString(16)}`);

    this.lightSensor = new BH1750_Library(options);

    // info service
    this.informationService = new Service.AccessoryInformation();
        
    this.informationService
    .setCharacteristic(Characteristic.Manufacturer, "ROHM SEMICONDUCTOR")
    .setCharacteristic(Characteristic.Model, config.model || "BH1750")
    .setCharacteristic(Characteristic.SerialNumber, config.serial || "A7CE1720-540E-4CCF-800D-9049B941812F");

    // lux service
    this.service_lux = new Service.LightSensor(this.name);

    this.service_lux.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
        .setProps({ minValue: 0, maxValue: 65535, minStep: 4 })
        .on('get', this.getLux.bind(this));

    if (config.autoRefresh && config.autoRefresh > 0) {
        const that = this;
        setInterval(async () => {
            try {
                const value = await that.lightSensor.readLight();
                that.service_lux.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
                    .setValue(parseFloat(value.toFixed(2)));
            } catch (err) {
                that.log.error('Error reading light level for auto-refresh:', err);
            }
        }, config.autoRefresh * 1000);
    }
}

BH1750.prototype.getLux = async function(callback) {
    try {
        const value = await this.lightSensor.readLight();
        callback(null, parseFloat(value.toFixed(2)));
    } catch (err) {
        this.log.error('Error getting light level:', err);
        callback(err);
    }
};

BH1750.prototype.getServices = function() {
    return [this.informationService, this.service_lux];
};