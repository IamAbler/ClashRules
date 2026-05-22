/*
使用方法：
在 Surge 配置中通过 argument 传入要筛选的 IP 前缀，多个用逗号分隔

示例：
type=dns,script-path=dns-filter.js,argument=147.90.,147.41.
*/

// 从 $argument 获取筛选规则
function getFilterPrefixes() {
    if (!$argument || $argument === "") {
        // 默认值：如果没有传 argument，保留 147. 开头的 IP
        console.log("No argument provided, using default: 147.");
        return ["147."];
    }
    
    // 支持多个前缀，用逗号分隔
    let prefixes = $argument.split(",").map(p => p.trim());
    console.log(`Filtering IPs with prefixes: ${prefixes.join(", ")}`);
    return prefixes;
}

// 检查 IP 是否匹配任一允许的前缀
function isAllowedIP(ip, allowedPrefixes) {
    for (let prefix of allowedPrefixes) {
        if (ip.startsWith(prefix)) {
            return true;
        }
    }
    return false;
}

// 主逻辑
if ($network.dns && $network.dns.ips && $network.dns.ips.length > 0) {
    let allowedPrefixes = getFilterPrefixes();
    let originalIPs = $network.dns.ips;
    let filteredIPs = originalIPs.filter(ip => isAllowedIP(ip, allowedPrefixes));
    
    console.log(`Domain: ${$domain || 'unknown'}`);
    console.log(`Original: ${originalIPs.join(", ")}`);
    console.log(`Filtered: ${filteredIPs.join(", ")}`);
    
    if (filteredIPs.length > 0) {
        $done({ addresses: filteredIPs });
    } else {
        // 没有匹配的 IP，返回空
        console.log("No matching IP found");
        $done({ addresses: [] });
    }
} else {
    // 没有缓存 IP，尝试主动查询
    if ($domain) {
        console.log(`No cached IP for ${$domain}, performing lookup...`);
        $httpClient.get(`https://223.5.5.5/resolve?name=${$domain}&type=A`, function(error, response, data) {
            if (error || !data) {
                $done({});
                return;
            }
            try {
                let result = JSON.parse(data);
                let ips = [];
                if (result.Answer) {
                    ips = result.Answer.filter(r => r.type === 1).map(r => r.data);
                }
                let allowedPrefixes = getFilterPrefixes();
                let filtered = ips.filter(ip => isAllowedIP(ip, allowedPrefixes));
                
                if (filtered.length > 0) {
                    $done({ addresses: filtered, ttl: 300 });
                } else {
                    $done({});
                }
            } catch(e) {
                $done({});
            }
        });
    } else {
        $done({});
    }
}
