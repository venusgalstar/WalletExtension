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

 Date: 11/06/2022 03:54:49
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
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of dex_list
-- ----------------------------
INSERT INTO `dex_list` VALUES (1, 'pangolin.exchange', '0x688d21b0b8dc35971af58cff1f7bf65639937860', '43113');
INSERT INTO `dex_list` VALUES (2, 'uniswap.com', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', '4');

-- ----------------------------
-- Table structure for erc20_list
-- ----------------------------
DROP TABLE IF EXISTS `erc20_list`;
CREATE TABLE `erc20_list`  (
  `id` int(10) NOT NULL AUTO_INCREMENT COMMENT 'id',
  `network_id` varchar(10) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'network id',
  `token_address` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'token address',
  `token_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'token name',
  `token_symbol` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'token symbol',
  `token_decimal` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'token decimals',
  `token_logo` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'token logo url',
  `token_type` int(10) NOT NULL COMMENT '0:wrapped native, 1:stable',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of erc20_list
-- ----------------------------

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
  `scanned_block_num` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 43115 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of network_list
-- ----------------------------
INSERT INTO `network_list` VALUES (97, 'BSC Testnet', 'BNB', '0xd00ae08403b9bbb9124bb305c09058e32c39a48c', '0x72557cc4dF0ce359E948A4D0Cf5B25eCD2e1e148', 'https://data-seed-prebsc-1-s1.binance.org:8545/', 0);
INSERT INTO `network_list` VALUES (43113, 'Avalanche Fuji Testnet', 'AVAX', '0xd00ae08403b9bbb9124bb305c09058e32c39a48c', '0x1B121385490F84851c0320D2A9638aB89cA4f993', 'https://api.avax-test.network/ext/bc/C/rpc', 0);

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
