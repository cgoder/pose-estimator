/**
 * 接口验证器
 * 用于验证类是否正确实现了指定的接口
 */
export class InterfaceValidator {
    /**
     * 验证类是否实现了指定接口的所有方法
     * @param {Object} instance - 要验证的实例
     * @param {Function} interfaceClass - 接口类
     * @param {string} className - 类名（用于错误信息）
     * @returns {boolean} 是否通过验证
     */
    static validate(instance, interfaceClass, className = 'Unknown') {
        if (!instance || !interfaceClass) {
            throw new Error('InterfaceValidator: instance and interfaceClass are required');
        }

        const errors = [];
        const interfacePrototype = interfaceClass.prototype;
        
        // 获取接口中定义的所有方法
        const interfaceMethods = Object.getOwnPropertyNames(interfacePrototype)
            .filter(name => {
                return name !== 'constructor' && 
                       typeof interfacePrototype[name] === 'function';
            });

        // 检查实例是否实现了所有接口方法
        for (const methodName of interfaceMethods) {
            if (typeof instance[methodName] !== 'function') {
                errors.push(`Method '${methodName}' is not implemented`);
            }
        }

        if (errors.length > 0) {
            const errorMessage = `${className} does not properly implement interface ${interfaceClass.name}:\n${errors.join('\n')}`;
            console.error(errorMessage);
            return false;
        }

        console.log(`✅ ${className} successfully implements ${interfaceClass.name}`);
        return true;
    }

    /**
     * 验证类是否实现了指定接口的所有方法（抛出异常版本）
     * @param {Object} instance - 要验证的实例
     * @param {Function} interfaceClass - 接口类
     * @param {string} className - 类名（用于错误信息）
     * @throws {Error} 如果验证失败
     */
    static validateOrThrow(instance, interfaceClass, className = 'Unknown') {
        if (!this.validate(instance, interfaceClass, className)) {
            throw new Error(`Interface validation failed for ${className}`);
        }
    }

    /**
     * 获取接口中定义的所有方法名
     * @param {Function} interfaceClass - 接口类
     * @returns {string[]} 方法名数组
     */
    static getInterfaceMethods(interfaceClass) {
        if (!interfaceClass || !interfaceClass.prototype) {
            return [];
        }

        return Object.getOwnPropertyNames(interfaceClass.prototype)
            .filter(name => {
                return name !== 'constructor' && 
                       typeof interfaceClass.prototype[name] === 'function';
            });
    }

    /**
     * 检查实例是否缺少某些方法
     * @param {Object} instance - 要检查的实例
     * @param {Function} interfaceClass - 接口类
     * @returns {string[]} 缺少的方法名数组
     */
    static getMissingMethods(instance, interfaceClass) {
        if (!instance || !interfaceClass) {
            return [];
        }

        const interfaceMethods = this.getInterfaceMethods(interfaceClass);
        return interfaceMethods.filter(methodName => {
            return typeof instance[methodName] !== 'function';
        });
    }

    /**
     * 检查实例是否有额外的方法（不在接口中定义）
     * @param {Object} instance - 要检查的实例
     * @param {Function} interfaceClass - 接口类
     * @returns {string[]} 额外的方法名数组
     */
    static getExtraMethods(instance, interfaceClass) {
        if (!instance || !interfaceClass) {
            return [];
        }

        const interfaceMethods = new Set(this.getInterfaceMethods(interfaceClass));
        const instanceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
            .filter(name => {
                return name !== 'constructor' && 
                       typeof instance[name] === 'function';
            });

        return instanceMethods.filter(methodName => {
            return !interfaceMethods.has(methodName);
        });
    }

    /**
     * 生成接口实现报告
     * @param {Object} instance - 要检查的实例
     * @param {Function} interfaceClass - 接口类
     * @param {string} className - 类名
     * @returns {Object} 实现报告
     */
    static generateReport(instance, interfaceClass, className = 'Unknown') {
        const interfaceMethods = this.getInterfaceMethods(interfaceClass);
        const missingMethods = this.getMissingMethods(instance, interfaceClass);
        const extraMethods = this.getExtraMethods(instance, interfaceClass);
        const implementedMethods = interfaceMethods.filter(method => 
            !missingMethods.includes(method)
        );

        return {
            className,
            interfaceName: interfaceClass.name,
            isValid: missingMethods.length === 0,
            interfaceMethods,
            implementedMethods,
            missingMethods,
            extraMethods,
            implementationRate: interfaceMethods.length > 0 
                ? (implementedMethods.length / interfaceMethods.length) * 100 
                : 100
        };
    }
}

export default InterfaceValidator;