// dns-filter.js - 带主动查询版本
if ($network.dns && $network.dns.ips && $network.dns.ips.length > 0) {
    // 有 IP 就直接过滤
    let filtered = $network.dns.ips.filter(ip => ip.startsWith("147."));
    $done({ addresses: filtered });
} else {
    // 没有 IP 时，主动发起 DNS 查询
    console.log(`No cached IPs for ${$domain}, doing lookup...`);
    
    $httpClient.get(`https://dns.google/resolve?name=${$domain}&type=A`, function(error, response, data) {
        if (error || !data) {
            $done({}); // 查询失败，交还给系统
            return;
        }
        
        try {
            let result = JSON.parse(data);
            let ips = [];
            if (result.Answer) {
                ips = result.Answer.filter(r => r.type === 1).map(r => r.data);
            }
            
            let filtered = ips.filter(ip => ip.startsWith("147."));
            console.log(`Lookup result - Original: ${ips}, Filtered: ${filtered}`);
            
            if (filtered.length > 0) {
                $done({ addresses: filtered, ttl: 300 });
            } else {
                $done({}); // 没有 147 的 IP，返回空
            }
        } catch(e) {
            console.log(`Parse error: ${e}`);
            $done({});
        }
    });
}
