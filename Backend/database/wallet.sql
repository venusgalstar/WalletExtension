/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 100411
 Source Host           : localhost:3306
 Source Schema         : wallet

 Target Server Type    : MySQL
 Target Server Version : 100411
 File Encoding         : 65001

 Date: 09/06/2022 00:29:10
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for dex_list
-- ----------------------------
DROP TABLE IF EXISTS `dex_list`;
CREATE TABLE `dex_list`  (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `router_address` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `network_id` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of dex_list
-- ----------------------------
INSERT INTO `dex_list` VALUES (1, 'pangolin.exchange', '0x688d21b0b8dc35971af58cff1f7bf65639937860', '43113');

-- ----------------------------
-- Table structure for erc20_list
-- ----------------------------
DROP TABLE IF EXISTS `erc20_list`;
CREATE TABLE `erc20_list`  (
  `id` int(10) NOT NULL AUTO_INCREMENT COMMENT 'id',
  `network_id` int(10) NOT NULL COMMENT 'network id',
  `token_address` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'token address',
  `token_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'token name',
  `token_symbol` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'token symbol',
  `token_decimal` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'token decimals',
  `token_logo` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'token logo url',
  `token_type` int(10) NOT NULL COMMENT '0:wrapped native, 1:stable',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 23 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of erc20_list
-- ----------------------------
INSERT INTO `erc20_list` VALUES (1, 43113, '0x638e99a717d3e140f3eebb84a35b7d72de2b02ed', 'A', 'A', '18', '', 2);
INSERT INTO `erc20_list` VALUES (2, 43113, '0x9f4b4e5d22d0e69b50cd871ae91f04cf123006c7', 'F', 'F', '18', '', 2);
INSERT INTO `erc20_list` VALUES (3, 43113, '0x08a978a0399465621e667c49cd54cc874dc064eb', 'avax20usdt', 'ausdt', '18', '', 1);
INSERT INTO `erc20_list` VALUES (4, 43114, '0xc7198437980c041c805a1edcba50c1ce5db95118', 'Tether USD', 'USDT', '18', '', 1);
INSERT INTO `erc20_list` VALUES (9, 43113, '0x67689D5203240b3443133795BAE50046bE59e6E2', 'ETH', 'ETH-6142022-2080.00-0', '18', '', 2);
INSERT INTO `erc20_list` VALUES (10, 43113, '0x3b1EB93D8A35EdD48d22C75601Acf0f84515fCfD', 'BTC', 'BTC-6132022-32000.00-1', '18', '', 2);
INSERT INTO `erc20_list` VALUES (11, 43113, '0x24548C0CE7722e45DE00245c4dC741985b4Ac74c', 'FIRE', 'FIRE', '18', '', 2);
INSERT INTO `erc20_list` VALUES (12, 43113, '0xf7937ca379fC2cD506c687FcE60EF9069987EBE1', 'MONTAG', 'ADN', '8', '', 2);
INSERT INTO `erc20_list` VALUES (13, 43113, '0xB51C7c2c9dF2fd424768886dAB1943c41FDD4544', 'ZeroToken', 'ZERO', '18', '', 2);
INSERT INTO `erc20_list` VALUES (14, 43113, '0x822D0bcFe2120Bf72cA77E78c455f27CEBf0F681', 'ZeroToken', 'ZERO', '18', '', 2);
INSERT INTO `erc20_list` VALUES (15, 43113, '0xcFEf2E076C890a40ed16e4c18CaA7352D1Ca509a', 'ZeroToken', 'ZERO', '18', '', 2);
INSERT INTO `erc20_list` VALUES (16, 43113, '0xAB4309d7EBcD1B1C7386D67dc8798F925213032F', 'ZeroToken', 'ZERO', '18', '', 2);
INSERT INTO `erc20_list` VALUES (17, 43113, '0x0ed51D1744483DF33b3E3a1955929BFC1211b86b', 'ZeroToken', 'ZERO', '18', '', 2);
INSERT INTO `erc20_list` VALUES (18, 43113, '0xC50Fd1502Caff32d8C751d451919A1876AF4c7A6', 'ZeroToken', 'ZERO', '18', '', 2);
INSERT INTO `erc20_list` VALUES (19, 43113, '0xA741f0513557001e579D41DB207b95A17780AE1f', 'ZeroToken', 'ZERO', '18', '', 2);
INSERT INTO `erc20_list` VALUES (20, 43113, '0xBfb550D6e27e6Df3Ce27Dfe108b28c9fA7b35178', 'ZeroToken', 'ZERO', '18', '', 2);
INSERT INTO `erc20_list` VALUES (21, 43113, '0x425faF0806E56cF26E844DD12E912cB1f9635867', 'NGM Token', 'NGM', '8', '', 2);
INSERT INTO `erc20_list` VALUES (22, 43113, '0xB26e2D67796C95a56fD21656dc9999053cA911D5', 'NGM Token', 'NGM', '18', '', 2);

-- ----------------------------
-- Table structure for network_list
-- ----------------------------
DROP TABLE IF EXISTS `network_list`;
CREATE TABLE `network_list`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'id',
  `network_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `native_symbol` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `wrapped_native_address` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `swap_contract_address` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `rpc_url` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 43114 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of network_list
-- ----------------------------
INSERT INTO `network_list` VALUES (43113, 'Avalanche Fuji Testnet', 'AVAX', '0xd00ae08403b9bbb9124bb305c09058e32c39a48c', '0x62EEA4Bfe209ab3cFe66E8519c5675EDE2271E3B', 'https://api.avax-test.network/ext/bc/C/rpc');

-- ----------------------------
-- Table structure for price_history
-- ----------------------------
DROP TABLE IF EXISTS `price_history`;
CREATE TABLE `price_history`  (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `network` int(10) NOT NULL COMMENT 'network id',
  `token_address` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `token_type` int(10) NOT NULL COMMENT '0:native, 1:erc20, 2:erc721, 3:erc1155',
  `timstamp` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of price_history
-- ----------------------------

SET FOREIGN_KEY_CHECKS = 1;
