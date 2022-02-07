import consola from "consola";
import { createClient } from "@supabase/supabase-js";
import { getOpenSeaFloorPrice } from "./_lib/opensea";
``
const supabaseUrl = process.env.SUPABASE_PUBLIC_URL;
const supabaseAnonKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async (req, res) => {
    let updatedCount = 0;

    // Get all NFT projects.
    const { data, error } = await supabase
        .from('projects')
        .select('id, name, marketplaces')
        .eq('type', 'nft')

    if (error) {
        console.log(error);
        return;
    }

    const asyncRes = await Promise.all(data.map(async (project) => {
        let match = false;
        let slug = null;
        const projectId = project.id;
        const projectName = project.name;
        const marketplaces = project.marketplaces;

        /**
         * Marketplaces array can also contain other marketplaces such as Rarible.
         * We need to find a match for OpenSea
         */
        if (marketplaces) {
            marketplaces.forEach(marketplace => {
                if (marketplace.name === 'OpenSea' && marketplace.slug) {
                    slug = marketplace.slug
                    match = true;
                }
            });
        }

        if (match) {
            consola.info(`Trying to scrape OpenSea floor data for ${projectName}`)

            const response = await getOpenSeaFloorPrice(slug).then(async (response) => {
                if (response) {
                    await supabase.from('projects').update({ current_price: response }, { returning: 'minimal' }).match({ id: projectId }).then(() => {
                        updatedCount++
                        consola.success(`Updated floor price to ${response} for ${projectName}`)
                    }).catch((err) => {
                        consola.error(err.message)
                    })
                } else {
                    consola.error(`Failed to get floor price for ${projectName}`)
                }
            })
        }
    }));

    consola.success(`Updated ${updatedCount} items!`)

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
        'updatedItems': updatedCount,
    });
};
